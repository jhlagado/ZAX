; ZAX lowered .asm trace
; range: $0100..$105D (end exclusive)

; func add_to_sample begin
add_to_sample:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
push AF                        ; 0108: F5
push BC                        ; 0109: C5
push DE                        ; 010A: D5
push AF                        ; 010B: F5
push BC                        ; 010C: C5
push DE                        ; 010D: D5
ld HL, sample_word             ; 010E: 21 00 00
pop DE                         ; 0111: D1
pop BC                         ; 0112: C1
pop AF                         ; 0113: F1
push DE                        ; 0114: D5
ld E, (HL)                     ; 0115: 5E
inc HL                         ; 0116: 23
ld D, (HL)                     ; 0117: 56
ld L, E                        ; 0118: 6B
ld H, D                        ; 0119: 62
pop DE                         ; 011A: D1
push AF                        ; 011B: F5
push BC                        ; 011C: C5
push DE                        ; 011D: D5
push IX                        ; 011E: DD E5
pop HL                         ; 0120: E1
ld DE, $0004                   ; 0121: 11 04 00
add HL, DE                     ; 0124: 19
push HL                        ; 0125: E5
pop HL                         ; 0126: E1
pop DE                         ; 0127: D1
pop BC                         ; 0128: C1
pop AF                         ; 0129: F1
ld E, (HL)                     ; 012A: 5E
inc HL                         ; 012B: 23
ld D, (HL)                     ; 012C: 56
ld E, E                        ; 012D: 5B
ld D, D                        ; 012E: 52
xor A                          ; 012F: AF
adc HL, DE                     ; 0130: ED 5A
__zax_epilogue_0:
pop DE                         ; 0132: D1
pop BC                         ; 0133: C1
pop AF                         ; 0134: F1
ld SP, IX                      ; 0135: DD F9
pop IX                         ; 0137: DD E1
ret                            ; 0139: C9
; func add_to_sample end
; func main begin
main:
push IX                        ; 013A: DD E5
ld IX, $0000                   ; 013C: DD 21 00 00
add IX, SP                     ; 0140: DD 39
push HL                        ; 0142: E5
ld HL, $0000                   ; 0143: 21 00 00
ex (SP), HL                    ; 0146: E3
push AF                        ; 0147: F5
push BC                        ; 0148: C5
push DE                        ; 0149: D5
push HL                        ; 014A: E5
ld A, (sample_byte)            ; 014B: 3A 00 00
ld HL, $0017                   ; 014E: 21 17 00
push HL                        ; 0151: E5
call add_to_sample             ; 0152: CD 00 00
inc SP                         ; 0155: 33
inc SP                         ; 0156: 33
push DE                        ; 0157: D5
ex DE, HL                      ; 0158: EB
push AF                        ; 0159: F5
push BC                        ; 015A: C5
push DE                        ; 015B: D5
push IX                        ; 015C: DD E5
pop HL                         ; 015E: E1
ld DE, $FFFE                   ; 015F: 11 FE FF
add HL, DE                     ; 0162: 19
push HL                        ; 0163: E5
pop HL                         ; 0164: E1
pop DE                         ; 0165: D1
pop BC                         ; 0166: C1
pop AF                         ; 0167: F1
ld (HL), E                     ; 0168: 73
inc HL                         ; 0169: 23
ld (HL), D                     ; 016A: 72
ex DE, HL                      ; 016B: EB
pop DE                         ; 016C: D1
__zax_epilogue_1:
pop HL                         ; 016D: E1
pop DE                         ; 016E: D1
pop BC                         ; 016F: C1
pop AF                         ; 0170: F1
ld SP, IX                      ; 0171: DD F9
pop IX                         ; 0173: DD E1
ret                            ; 0175: C9
; func main end

; symbols:
; label add_to_sample = $0100
; label __zax_epilogue_0 = $0132
; label main = $013A
; label __zax_epilogue_1 = $016D
; data sample_byte = $1000
; data sample_word = $1001
; label __zax_startup = $1003
