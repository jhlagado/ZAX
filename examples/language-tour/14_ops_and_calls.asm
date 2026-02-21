; ZAX lowered .asm trace
; range: $0100..$0153 (end exclusive)

; func add_to_sample begin
add_to_sample:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
push AF                        ; 0108: F5
push BC                        ; 0109: C5
push DE                        ; 010A: D5
ld HL, (sample_word)           ; 010B: 2A 00 00
ld E, (IX + $0004)             ; 010E: DD 5E 04
ld D, (IX + $0005)             ; 0111: DD 56 05
xor A                          ; 0114: AF
adc HL, DE                     ; 0115: ED 5A
__zax_epilogue_0:
pop DE                         ; 0117: D1
pop BC                         ; 0118: C1
pop AF                         ; 0119: F1
ld SP, IX                      ; 011A: DD F9
pop IX                         ; 011C: DD E1
ret                            ; 011E: C9
; func add_to_sample end
; func main begin
main:
push IX                        ; 011F: DD E5
ld IX, $0000                   ; 0121: DD 21 00 00
add IX, SP                     ; 0125: DD 39
push AF                        ; 0127: F5
push BC                        ; 0128: C5
push DE                        ; 0129: D5
push HL                        ; 012A: E5
ld HL, $0000                   ; 012B: 21 00 00
push HL                        ; 012E: E5
ld A, (sample_byte)            ; 012F: 3A 00 00
ld HL, $0017                   ; 0132: 21 17 00
push HL                        ; 0135: E5
call add_to_sample             ; 0136: CD 00 00
inc SP                         ; 0139: 33
inc SP                         ; 013A: 33
push DE                        ; 013B: D5
ex DE, HL                      ; 013C: EB
ld (IX - $000A), E             ; 013D: DD 73 F6
ld (IX - $0009), D             ; 0140: DD 72 F7
ex DE, HL                      ; 0143: EB
pop DE                         ; 0144: D1
__zax_epilogue_1:
ld HL, $0002                   ; 0145: 21 02 00
add HL, SP                     ; 0148: 39
ld SP, HL                      ; 0149: F9
pop HL                         ; 014A: E1
pop DE                         ; 014B: D1
pop BC                         ; 014C: C1
pop AF                         ; 014D: F1
ld SP, IX                      ; 014E: DD F9
pop IX                         ; 0150: DD E1
ret                            ; 0152: C9
; func main end

; symbols:
; label add_to_sample = $0100
; label __zax_epilogue_0 = $0117
; label main = $011F
; label __zax_epilogue_1 = $0145
; var sample_byte = $0154
; var sample_word = $0155
