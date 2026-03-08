; ZAX lowered .asm trace
; range: $0100..$01A7 (end exclusive)

; func add_words begin
add_words:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
push AF                        ; 0108: F5
push BC                        ; 0109: C5
push DE                        ; 010A: D5
ex DE, HL                      ; 010B: EB
ld E, (IX + $0004)             ; 010C: DD 5E 04
ld D, (IX + $0005)             ; 010F: DD 56 05
ex DE, HL                      ; 0112: EB
ld E, (IX + $0006)             ; 0113: DD 5E 06
ld D, (IX + $0007)             ; 0116: DD 56 07
add HL, DE                     ; 0119: 19
__zax_epilogue_0:
pop DE                         ; 011A: D1
pop BC                         ; 011B: C1
pop AF                         ; 011C: F1
ld SP, IX                      ; 011D: DD F9
pop IX                         ; 011F: DD E1
ret                            ; 0121: C9
; func add_words end
; func bump_byte begin
bump_byte:
push IX                        ; 0122: DD E5
ld IX, $0000                   ; 0124: DD 21 00 00
add IX, SP                     ; 0128: DD 39
ld HL, $0000                   ; 012A: 21 00 00
push HL                        ; 012D: E5
push AF                        ; 012E: F5
push BC                        ; 012F: C5
push DE                        ; 0130: D5
ex DE, HL                      ; 0131: EB
ld E, (IX + $0004)             ; 0132: DD 5E 04
ex DE, HL                      ; 0135: EB
ld H, $0000                    ; 0136: 26 00
inc L                          ; 0138: 2C
push DE                        ; 0139: D5
ex DE, HL                      ; 013A: EB
push AF                        ; 013B: F5
push BC                        ; 013C: C5
push DE                        ; 013D: D5
push IX                        ; 013E: DD E5
pop HL                         ; 0140: E1
ld DE, $FFFE                   ; 0141: 11 FE FF
add HL, DE                     ; 0144: 19
push HL                        ; 0145: E5
pop HL                         ; 0146: E1
pop DE                         ; 0147: D1
pop BC                         ; 0148: C1
pop AF                         ; 0149: F1
ld (hl), E                     ; 014A: 73
inc HL                         ; 014B: 23
ld (hl), D                     ; 014C: 72
ex DE, HL                      ; 014D: EB
pop DE                         ; 014E: D1
ex DE, HL                      ; 014F: EB
ld E, (IX - $0002)             ; 0150: DD 5E FE
ld D, (IX - $0001)             ; 0153: DD 56 FF
ex DE, HL                      ; 0156: EB
__zax_epilogue_1:
pop DE                         ; 0157: D1
pop BC                         ; 0158: C1
pop AF                         ; 0159: F1
ld SP, IX                      ; 015A: DD F9
pop IX                         ; 015C: DD E1
ret                            ; 015E: C9
; func bump_byte end
; func main begin
main:
push IX                        ; 015F: DD E5
ld IX, $0000                   ; 0161: DD 21 00 00
add IX, SP                     ; 0165: DD 39
push HL                        ; 0167: E5
ld HL, $0000                   ; 0168: 21 00 00
ex (SP), HL                    ; 016B: E3
push AF                        ; 016C: F5
push BC                        ; 016D: C5
push DE                        ; 016E: D5
push HL                        ; 016F: E5
ld HL, $0014                   ; 0170: 21 14 00
push HL                        ; 0173: E5
ld HL, $000A                   ; 0174: 21 0A 00
push HL                        ; 0177: E5
call add_words                 ; 0178: CD 00 00
inc SP                         ; 017B: 33
inc SP                         ; 017C: 33
inc SP                         ; 017D: 33
inc SP                         ; 017E: 33
push DE                        ; 017F: D5
ex DE, HL                      ; 0180: EB
push AF                        ; 0181: F5
push BC                        ; 0182: C5
push DE                        ; 0183: D5
push IX                        ; 0184: DD E5
pop HL                         ; 0186: E1
ld DE, $FFFE                   ; 0187: 11 FE FF
add HL, DE                     ; 018A: 19
push HL                        ; 018B: E5
pop HL                         ; 018C: E1
pop DE                         ; 018D: D1
pop BC                         ; 018E: C1
pop AF                         ; 018F: F1
ld (hl), E                     ; 0190: 73
inc HL                         ; 0191: 23
ld (hl), D                     ; 0192: 72
ex DE, HL                      ; 0193: EB
pop DE                         ; 0194: D1
ld HL, $0007                   ; 0195: 21 07 00
push HL                        ; 0198: E5
call bump_byte                 ; 0199: CD 00 00
inc SP                         ; 019C: 33
inc SP                         ; 019D: 33
__zax_epilogue_2:
pop HL                         ; 019E: E1
pop DE                         ; 019F: D1
pop BC                         ; 01A0: C1
pop AF                         ; 01A1: F1
ld SP, IX                      ; 01A2: DD F9
pop IX                         ; 01A4: DD E1
ret                            ; 01A6: C9
; func main end

; symbols:
; label add_words = $0100
; label __zax_epilogue_0 = $011A
; label bump_byte = $0122
; label __zax_epilogue_1 = $0157
; label main = $015F
; label __zax_epilogue_2 = $019E
