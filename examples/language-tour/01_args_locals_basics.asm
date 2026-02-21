; ZAX lowered .asm trace
; range: $0100..$01A2 (end exclusive)

; func add_words begin
add_words:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
push AF                        ; 0108: F5
push BC                        ; 0109: C5
push DE                        ; 010A: D5
push DE                        ; 010B: D5
ex DE, HL                      ; 010C: EB
ld E, (IX + $0004)             ; 010D: DD 5E 04
ld D, (IX + $0005)             ; 0110: DD 56 05
ex DE, HL                      ; 0113: EB
pop DE                         ; 0114: D1
ld E, (IX + $0006)             ; 0115: DD 5E 06
ld D, (IX + $0007)             ; 0118: DD 56 07
add HL, DE                     ; 011B: 19
__zax_epilogue_0:
pop DE                         ; 011C: D1
pop BC                         ; 011D: C1
pop AF                         ; 011E: F1
ld SP, IX                      ; 011F: DD F9
pop IX                         ; 0121: DD E1
ret                            ; 0123: C9
; func add_words end
; func bump_byte begin
bump_byte:
push IX                        ; 0124: DD E5
ld IX, $0000                   ; 0126: DD 21 00 00
add IX, SP                     ; 012A: DD 39
push AF                        ; 012C: F5
push BC                        ; 012D: C5
push DE                        ; 012E: D5
ld HL, $0000                   ; 012F: 21 00 00
push HL                        ; 0132: E5
push DE                        ; 0133: D5
push IX                        ; 0134: DD E5
pop HL                         ; 0136: E1
ld DE, $0004                   ; 0137: 11 04 00
add HL, DE                     ; 013A: 19
push HL                        ; 013B: E5
pop DE                         ; 013C: D1
ld L, (hl)                     ; 013D: 6E
ld H, $0000                    ; 013E: 26 00
inc L                          ; 0140: 2C
push DE                        ; 0141: D5
ex DE, HL                      ; 0142: EB
ld (IX - $0008), E             ; 0143: DD 73 F8
ld (IX - $0007), D             ; 0146: DD 72 F9
ex DE, HL                      ; 0149: EB
pop DE                         ; 014A: D1
push DE                        ; 014B: D5
ex DE, HL                      ; 014C: EB
ld E, (IX - $0008)             ; 014D: DD 5E F8
ld D, (IX - $0007)             ; 0150: DD 56 F9
ex DE, HL                      ; 0153: EB
pop DE                         ; 0154: D1
__zax_epilogue_1:
ld HL, $0002                   ; 0155: 21 02 00
add HL, SP                     ; 0158: 39
ld SP, HL                      ; 0159: F9
pop DE                         ; 015A: D1
pop BC                         ; 015B: C1
pop AF                         ; 015C: F1
ld SP, IX                      ; 015D: DD F9
pop IX                         ; 015F: DD E1
ret                            ; 0161: C9
; func bump_byte end
; func main begin
main:
push IX                        ; 0162: DD E5
ld IX, $0000                   ; 0164: DD 21 00 00
add IX, SP                     ; 0168: DD 39
push AF                        ; 016A: F5
push BC                        ; 016B: C5
push DE                        ; 016C: D5
push HL                        ; 016D: E5
ld HL, $0000                   ; 016E: 21 00 00
push HL                        ; 0171: E5
ld HL, $0014                   ; 0172: 21 14 00
push HL                        ; 0175: E5
ld HL, $000A                   ; 0176: 21 0A 00
push HL                        ; 0179: E5
call add_words                 ; 017A: CD 00 00
inc SP                         ; 017D: 33
inc SP                         ; 017E: 33
inc SP                         ; 017F: 33
inc SP                         ; 0180: 33
push DE                        ; 0181: D5
ex DE, HL                      ; 0182: EB
ld (IX - $000A), E             ; 0183: DD 73 F6
ld (IX - $0009), D             ; 0186: DD 72 F7
ex DE, HL                      ; 0189: EB
pop DE                         ; 018A: D1
ld HL, $0007                   ; 018B: 21 07 00
push HL                        ; 018E: E5
call bump_byte                 ; 018F: CD 00 00
inc SP                         ; 0192: 33
inc SP                         ; 0193: 33
__zax_epilogue_2:
ld HL, $0002                   ; 0194: 21 02 00
add HL, SP                     ; 0197: 39
ld SP, HL                      ; 0198: F9
pop HL                         ; 0199: E1
pop DE                         ; 019A: D1
pop BC                         ; 019B: C1
pop AF                         ; 019C: F1
ld SP, IX                      ; 019D: DD F9
pop IX                         ; 019F: DD E1
ret                            ; 01A1: C9
; func main end

; symbols:
; label add_words = $0100
; label __zax_epilogue_0 = $011C
; label bump_byte = $0124
; label __zax_epilogue_1 = $0155
; label main = $0162
; label __zax_epilogue_2 = $0194
