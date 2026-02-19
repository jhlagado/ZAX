; ZAX lowered .asm trace
; range: $0100..$0154 (end exclusive)

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
push HL                        ; 0127: E5
ld HL, $0000                   ; 0128: 21 00 00
push HL                        ; 012B: E5
push DE                        ; 012C: D5
push BC                        ; 012D: C5
push AF                        ; 012E: F5
ld A, (sample_byte)            ; 012F: 3A 00 00
ld HL, $0017                   ; 0132: 21 17 00
push HL                        ; 0135: E5
call add_to_sample             ; 0136: CD 00 00
inc SP                         ; 0139: 33
inc SP                         ; 013A: 33
push DE                        ; 013B: D5
ex DE, HL                      ; 013C: EB
ld (IX - $0004), E             ; 013D: DD 73 FC
ld (IX - $0003), D             ; 0140: DD 72 FD
ex DE, HL                      ; 0143: EB
pop DE                         ; 0144: D1
__zax_epilogue_1:
pop DE                         ; 0145: D1
pop BC                         ; 0146: C1
pop AF                         ; 0147: F1
ld e, (ix-$0002)               ; 0148: DD 5E FE
ld d, (ix-$0001)               ; 014B: DD 56 FF
ex de, hl                      ; 014E: EB
ld SP, IX                      ; 014F: DD F9
pop IX                         ; 0151: DD E1
ret                            ; 0153: C9
; func main end

; symbols:
; label add_to_sample = $0100
; label __zax_epilogue_0 = $0117
; label main = $011F
; label __zax_epilogue_1 = $0145
; var sample_byte = $0154
; var sample_word = $0155
